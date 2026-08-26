import { Machine, WalletState, Transaction, AdminTask, AppNotification } from '../types';

import solarMechImg from '../assets/images/solar_mech_mower_1787659824325.jpg';
import dsMiningShoeImg from '../assets/images/ds_mining_shoe_1787659840182.jpg';
import cleanHydroImg from '../assets/images/clean_hydro_turbine_1787659856249.jpg';

export const AVAILABLE_CATALOG: Machine[] = [
  {
    id: 'mach_starter_15k',
    title: 'STARTER NODE',
    subtitle: '(Entry-level Miner)',
    category: 'DS-Mining',
    image: solarMechImg,
    dailyRewardUGX: 1250,
    status: 'Active',
    estYearlyROI: 3000,
    minInvestUGX: 15000,
    hashrate: '2.5 TH/s',
    powerSource: 'Grid Power',
    uptime: '99.50%',
    temperature: '35.0°C',
    efficiency: 95.0,
    totalMinedUGX: 0,
    unclaimedRewardsUGX: 0,
    isBoosted: false,
  },
  {
    id: 'mach_solar_mech_10',
    title: 'SOLAR-MECH 10',
    subtitle: '(Advanced Mower-Miner)',
    category: 'DS-Mining',
    image: solarMechImg,
    dailyRewardUGX: 212328,
    status: 'Active',
    estYearlyROI: 120,
    minInvestUGX: 5000000,
    hashrate: '54.2 TH/s',
    powerSource: 'Solar 1.2kW Array + Dual Kinetic Blade Dynamos',
    uptime: '99.94%',
    temperature: '41.2°C',
    efficiency: 99.2,
    totalMinedUGX: 18450000,
    unclaimedRewardsUGX: 142800,
    isBoosted: false,
  },
  {
    id: 'mach_ds_mining_shoe',
    title: 'DS-MINING SHOE (Series 1)',
    subtitle: undefined,
    category: 'DS-Mining',
    image: dsMiningShoeImg,
    dailyRewardUGX: 1200000,
    status: 'Active',
    estYearlyROI: 135,
    minInvestUGX: 25000000,
    hashrate: '210.8 TH/s',
    powerSource: 'Kinetic-Electro Hybrid Regenerative Coil',
    uptime: '99.98%',
    temperature: '38.6°C',
    efficiency: 98.8,
    totalMinedUGX: 148200000,
    unclaimedRewardsUGX: 890000,
    isBoosted: true,
  },
  {
    id: 'mach_hydro_turbine_x500',
    title: 'HYDRO-MINER X500',
    subtitle: '(Micro-Hydro Generator)',
    category: 'Clean Energy',
    image: cleanHydroImg,
    dailyRewardUGX: 717672,
    status: 'Active',
    estYearlyROI: 110,
    minInvestUGX: 10000000,
    hashrate: '118.0 TH/s',
    powerSource: 'Micro-Hydro Turbine + Closed Loop Coolant',
    uptime: '99.85%',
    temperature: '32.1°C',
    efficiency: 99.6,
    totalMinedUGX: 42100000,
    unclaimedRewardsUGX: 350000,
    isBoosted: false,
  },
  {
    id: 'mach_quantum_vip_9000',
    title: 'QUANTUM VIP NODE-9',
    subtitle: '(High-Density Institutional Rig)',
    category: 'VIP Products',
    image: dsMiningShoeImg,
    dailyRewardUGX: 4500000,
    status: 'Reserved',
    estYearlyROI: 180,
    minInvestUGX: 100000000,
    hashrate: '1,250.0 TH/s',
    powerSource: 'Direct Grid / Cryo-Immersion Subsystem',
    uptime: '100.00%',
    temperature: '26.4°C',
    efficiency: 99.9,
    totalMinedUGX: 0,
    unclaimedRewardsUGX: 0,
    isBoosted: false,
  }
];

export const INITIAL_MACHINES: Machine[] = [];

export const INITIAL_WALLET: WalletState = {
  totalBalanceUGX: 0,
  dailyPnlUGX: 0,
  activeMachinesCount: 0,
  pendingTasksCount: 0,
};

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_ADMIN_TASKS: AdminTask[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

