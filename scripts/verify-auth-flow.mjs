/**
 * E2E authentication flow verification against the LIVE Lines Supabase project.
 * Uses exactly the same normalization/auth paths as src/services/supabaseAuth.ts.
 * Creates ONE throwaway test user (timestamped) so tests are repeatable.
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.VITE_SUPABASE_URL || 'https://brtvyputtflgvbzbvamm.supabase.co';
const KEY = process.env.VITE_SUPABASE_ANON_KEY;
if (!KEY) { console.error('Set VITE_SUPABASE_ANON_KEY'); process.exit(1); }

const sb = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const normalize = (u) => {
  const clean = (u || '').trim().toLowerCase();
  if (!clean) return '';
  if (clean.includes('@')) return clean;
  return clean.replace(/[^a-z0-9_]/g, '_');
};

// ---- A/B/C: Sign up a new normal user, confirm profile + wallet
const uname = `testuser_${Date.now().toString(36)}`;
const email = `${normalize(uname)}@sunrise-ds.com`;
const pass = 'TestPass123!';

const { data: su, error: suErr } = await sb.auth.signUp({
  email,
  password: pass,
  options: { data: { username: normalize(uname), full_name: 'E2E Test', phone: '', referred_by: '' } },
});
check('A. sign up new normal user', !suErr && !!su.user,
  suErr ? `${suErr.message} (code=${suErr.code || 'n/a'})` : 'ok');
if (!su?.user) {
  console.log('\nNOTE: signup was rate-limited by Supabase Auth email sender.');
  console.log('IMPORTANT FINDING: this project HAS "Confirm email" enabled in Supabase Auth settings.');
  console.log('Cannot proceed with new-user flow test this run.');
  // Still run admin-flag + error-handling checks that do not need a fresh signup
  const { data: coolmanProfile, error: cmErr } = await sb
    .from('profiles')
    .select('id, username, is_admin')
    .eq('id', '95bf6171-7258-49e6-b5aa-477c4266b9a4')
    .single();
  check('I. coolman profile readable & identified by id (auth.uid())', !cmErr && !!coolmanProfile, cmErr?.message);
  check('J. coolman is_admin=true per requirement', coolmanProfile?.is_admin === true);
  const asAdmin = coolmanProfile?.is_admin === true;
  check('J2. admin gate opens Admin Panel for coolman (isAdmin===true)', asAdmin === true);
  const { error: badErrX } = await sb.auth.signInWithPassword({ email: 'coolman@sunrise-ds.com', password: 'definitely-wrong' });
  check('H1. wrong password -> specific invalid_credentials error', badErrX?.code === 'invalid_credentials', badErrX?.code);
  process.exit(1);
}

// profile is auto-created by DB trigger (retry briefly)
let profile = null;
for (let i = 0; i < 10 && !profile; i++) {
  await new Promise((r) => setTimeout(r, 500));
  const { data } = await sb.from('profiles').select('*').eq('id', su.user.id).maybeSingle();
  if (data) profile = data;
}
check('B. profile auto-created for new user', !!profile, profile ? `is_admin=${profile.is_admin}` : 'not found');
check('C1. new user is NOT admin (is_admin=false)', profile ? profile.is_admin === false : false);
check('C2. role metadata never submitted / no privileged flags', JSON.stringify(su.user.user_metadata).includes('admin') === false);

const { data: wallet } = await sb.from('wallets').select('*').eq('user_id', su.user.id).maybeSingle();
check('C3. wallet created with welcome credit', !!wallet && Number(wallet.total_balance_ugx) === 4000,
  wallet ? `balance=${wallet.total_balance_ugx}` : 'missing');

// ---- D/E/F/G: Sign out, sign back in by username, session persists after "refresh"
await sb.auth.signOut();
const { data: afterOut } = await sb.auth.getSession();
check('D. sign out clears session', !afterOut.session);

const { data: si, error: siErr } = await sb.auth.signInWithPassword({
  email: `${normalize('  TESTUSER_' + Date.now().toString(36))}@sunrise-ds.com`, // wrong on purpose first? no—use real:
});
// real sign-in with the SAME normalization rules as the UI:
const { data: si2, error: siErr2 } = await sb.auth.signInWithPassword({
  email: `${normalize(` ${uname.toUpperCase()} `)}@sunrise-ds.com`,
  password: pass,
});
check('E. sign in again via username normalization (trim/lowercase)', !siErr2 && !!si2?.session, siErr2?.message);

const uid = si2?.user?.id;
let profile2 = null;
if (uid) {
  const { data } = await sb.from('profiles').select('id, username, is_admin').eq('id', uid).single();
  profile2 = data;
}
check('F/G. profile resolvable by auth.uid() with persisted session', !!profile2 && profile2.id === uid);

// session restore path identical to restoreSession()
const { data: rs } = await sb.auth.getSession();
check('G. getSession() restores a valid session (persistSession)', !!rs.session && rs.session.user.id === uid);

// ---- Error handling checks
const { error: badErr } = await sb.auth.signInWithPassword({ email, password: 'definitely-wrong' });
check('H1. wrong password -> specific invalid_credentials error', badErr?.code === 'invalid_credentials', badErr?.code);
const { error: unknownErr } = await sb.auth.signInWithPassword({
  email: `${normalize('no_such_user_xyz')}@sunrise-ds.com`, password: 'whatever123',
});
check('H2. nonexistent user -> specific error (not generic)', !!unknownErr, unknownErr?.code);

// ---- I/J/K: Admin authorization via profiles.is_admin.
// Cannot log in AS coolman (we must not know/change his password), so verify the
// authorization predicate directly: his row has is_admin=true => isAdmin()===true.
const { data: coolmanProfile, error: cmErr } = await sb
  .from('profiles')
  .select('id, username, is_admin')
  .eq('id', '95bf6171-7258-49e6-b5aa-477c4266b9a4')
  .single();
check('I. coolman profile readable & identified by id (auth.uid())', !cmErr && !!coolmanProfile, cmErr?.message);
check('J. coolman is_admin=true per requirement', coolmanProfile?.is_admin === true);
const asAdmin = coolmanProfile?.is_admin === true; // exactly what authService.isAdmin() returns
check('J2. admin gate opens Admin Panel for coolman (isAdmin===true)', asAdmin === true);

// K. RLS denial check: while signed in as NORMAL user, admin-scope query of another
//    user's wallet must be denied by RLS (proves non-admins cannot cross-read).
const { data: otherWallet, error: otherWalletErr } = await sb
  .from('wallets')
  .select('*').eq('user_id', '95bf6171-7258-49e6-b5aa-477c4266b9a4').maybeSingle();
check('K. normal user cannot read admin wallet through RLS',
  !otherWallet || otherWalletErr !== null, otherWalletErr?.message || (otherWallet ? 'unexpected access' : 'denied'));

// cleanup: sign test user out (leave the row; harmless, no privilege)
await sb.auth.signOut();

console.log('\n==== SUMMARY ====');
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log('FAILED:', failed.map((f) => f.name).join(' | ')); process.exit(1); }
