'use client';

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Users as UsersIcon,
  Package,
  BriefcaseBusiness,
  Layers,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import styles from './page.module.css';
import { useAuth } from '@/context/AuthContext';

const stats = [
  { title: 'ORDERS', value: '1,587', change: '+11%', trend: 'up', icon: ShoppingBag, color: '#1abc9c' },
  { title: 'REVENUE', value: '$46,782', change: '-29%', trend: 'down', icon: DollarSign, color: '#f1556c' },
  { title: 'AVERAGE PRICE', value: '$15.9', change: '+0%', trend: 'neutral', icon: TrendingUp, color: '#3bafda' },
  { title: 'PRODUCT SOLD', value: '1,890', change: '+89%', trend: 'up', icon: Package, color: '#f7b84b' },
];

const data = [
  { name: '2005', a: 4000, b: 2400, c: 2400 },
  { name: '2006', a: 3000, b: 1398, c: 2210 },
  { name: '2007', a: 2000, b: 9800, c: 2290 },
  { name: '2008', a: 2780, b: 3908, c: 2000 },
  { name: '2009', a: 1890, b: 4800, c: 2181 },
  { name: '2010', a: 2390, b: 3800, c: 2500 },
  { name: '2011', a: 3490, b: 4300, c: 2100 },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className={styles.dashboard}>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Dashboard</h2>
        </div>
        <div className={styles.actionButtons}>
          <Link href="/sales" className={styles.usersBtn} style={{ background: 'linear-gradient(to right, #ff9966, #ff5e62)', color: 'white', marginRight: '10px', border: 'none' }}>
            <BarChart3 size={18} />
            Sales
          </Link>
          <Link href="/em" className={styles.usersBtn} style={{ background: 'linear-gradient(to right, #8a2387, #e94057, #f27121)', color: 'white', marginRight: '10px', border: 'none' }}>

            <Layers size={18} />
            EM
          </Link>
          <Link href="/hrms" className={styles.usersBtn} style={{ background: 'linear-gradient(to right, #00c6ff, #0072ff)', color: 'white', marginRight: '10px', border: 'none' }}>
            <UsersIcon size={18} />
            HRMS
          </Link>
          {user?.role === 'Admin' && (
            <Link href="/users" className={styles.usersBtn} style={{ background: 'linear-gradient(to right, #11998e, #38ef7d)', color: 'white', marginRight: '10px', border: 'none' }}>
              <UsersIcon size={18} />
              Users
            </Link>
          )}
          <Link href="/projects" className={styles.portfolioBtn} style={{ background: 'linear-gradient(to right, #4b6cb7, #182848)', color: 'white', border: 'none' }}>
            <BriefcaseBusiness size={18} />
            Go to Project Portfolio
          </Link>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((stat, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>{stat.title}</span>
              <div className={styles.statIconBg} style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                <stat.icon size={20} />
              </div>
            </div>
            <div className={styles.statBody}>
              <h3>{stat.value}</h3>
              <span className={`${styles.statChange} ${styles[stat.trend]}`}>
                {stat.change} <span>From previous period</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h4>Sales Statistics</h4>
            <div className={styles.chartTabs}>
              <span>Today</span>
              <span className={styles.active}>This Week</span>
              <span>Last Week</span>
            </div>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="a" fill="#1abc9c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="b" fill="#3bafda" radius={[4, 4, 0, 0]} />
                <Bar dataKey="c" fill="#f1556c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h4>Trends Monthly</h4>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3bafda" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3bafda" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip />
                <Area type="monotone" dataKey="a" stroke="#3bafda" fillOpacity={1} fill="url(#colorUv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
