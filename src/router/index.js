import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore'

import Home from '@/views/Home.vue'
import Summary from '@/views/Summary.vue'
import Deliveries from '@/components/DeliveryDashboard.vue'
import Unauthorized from '@/views/Unauthorized.vue'
import Account from '@/views/Account.vue'
import Login from '@/views/Login.vue'
import ShareableReport from '@/views/ShareableReport.vue'
import QuickPickupLog from '@/views/QuickPickupLog.vue'
import ComponentShowcase from '@/views/ComponentShowcase.vue'

// 👇 NEW dashboard views
import AdminDashboard from '@/views/AdminDashboard.vue'
import ExecutiveDashboard from '@/views/ExecutiveDashboard.vue'
import EmployeeAdminDashboard from '@/views/EmployeeAdminDashboard.vue'
import EmployeeDashboard from '@/views/EmployeePayout.vue'
import AdminPayouts from '@/views/AdminPayouts.vue'
import EmployeePayout from '@/views/EmployeePayout.vue'
import GeneratePayouts from '@/views/GeneratePayouts.vue'
import SubconDeliveryForm from '../views/SubconDeliveryForm.vue'
import CashTracker from '../views/CashTracker.vue'
import NewSummary from '@/views/NewSummary.vue'
import EmployeePayroll from '@/views/EmployeePayroll.vue'
import MyPayroll from '@/views/MyPayroll.vue'
import CompanyLoans from '@/views/CompanyLoans.vue'
import SavingsSummary from '@/views/SavingsSummary.vue'
import CompanySavings from '@/views/CompanySavings.vue'
import SummaryTab from '../views/SummaryTab.vue'
import Settings from '../views/Settings.vue'
import PayrollEditor from '@/components/PayrollEditor.vue'
import GeneratePayrollView from '@/views/GeneratePayrollView.vue'
import ReturnsView from '@/views/ReturnsView.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/account', component: Account },
  { path: '/login', component: Login },

  // Component Showcase
  {
    path: '/components',
    name: 'ComponentShowcase',
    component: ComponentShowcase,
    meta: { requiresAuth: true, roles: ['admin'] }
  },

  // Quick Pickup Log (no auth required)
  {
    path: '/quick-pickup',
    name: 'QuickPickupLog',
    component: QuickPickupLog
  },

  // Public report route (no auth required)
  {
    path: '/report/:id',
    name: 'ShareableReport',
    component: ShareableReport,
    props: route => ({
      id: route.params.id,
      startDate: route.query.start,
      endDate: route.query.end
    })
  },

  // Returns & Repairs
  {
    path: '/returns',
    name: 'returns',
    component: ReturnsView,
    meta: { requiresAuth: true, roles: ['admin', 'employee_admin'] }
  },

  // 🔐 Dashboards by role
  {
    path: '/payroll',
    name: 'PayrollTabs',
    component: () => import('@/views/PayrollTabs.vue'),
    children: [
      {
        path: 'generate',
        name: 'generate-payroll',
        component: GeneratePayrollView
      }
    ]
  },

  {
    path: '/generate',
    component: GeneratePayouts,
    //meta: { requiresAuth: true, roles: ['admin'] }
  },
  {
    path: '/cashtracker',
    component: CashTracker,
    meta: { requiresAuth: true, roles: ['admin', 'employee_admin'] }
  },
  {
    path: '/subcon',
    name: 'SubconDeliveryForm',
    component: SubconDeliveryForm,
  },
  {
    path: '/admin',
    component: AdminDashboard,
    meta: { requiresAuth: true, roles: ['admin'] }
  },
  {
    path: '/payout/:id',
    component: EmployeePayout,
    //meta: { requiresAuth: true, roles: ['admin', 'employee'] }
  },
  {
    path: '/employee',
    component: EmployeeDashboard,
    meta: { requiresAuth: true, roles: ['employee'] }
  },

  {
    path: '/executive',
    component: ExecutiveDashboard
  },
  {
    path: '/input',
    component: CashTracker,
    meta: { requiresAuth: true, roles: ['employee_admin'] }
  },
  {
    path: '/employee',
    component: EmployeeDashboard,
    meta: { requiresAuth: true, roles: ['employee'] }
  },
  {
    path: '/employee-payroll',
    component: EmployeePayroll,
    meta: { requiresAuth: true, roles: ['admin', 'employee_admin'] }
  },
  {
    path: '/my-payroll',
    component: MyPayroll,
    meta: { requiresAuth: true, roles: ['admin', 'employee_admin', 'employee'] }
  },
  {
    path: '/loan',
    component: CompanyLoans,
    meta: { requiresAuth: true, roles: ['admin', 'employee_admin'] }
  },
  {
    path: '/savings/:id?',
    component: SavingsSummary,
    meta: { requiresAuth: true, roles: ['admin', 'employee_admin'] }
  },
  {
    path: '/company-savings',
    component: CompanySavings,
    meta: { requiresAuth: true, roles: ['admin', 'employee_admin'] }
  },
  // 🔐 Shared/utility routes
  {
    path: '/summary',
    name: 'summary',
    component: () => import('@/views/Summary.vue')
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings
  },
  {
    path: '/deliveries',
    component: Deliveries,
    meta: { requiresAuth: true, roles: ['admin', 'employee_admin'] }
  },
  {
    path: '/unauthorized',
    component: Unauthorized
  },
  {
    path: '/newsummary',
    component: NewSummary
  },
  {
    path: '/payroll-editor',
    name: 'payroll-editor',
    component: PayrollEditor
  },
  // 🚚 Driver routes
  {
    path: '/driver',
    component: () => import('@/views/DriverDashboard.vue'),
    meta: { requiresAuth: true, roles: ['driver', 'admin'] }
  },
  {
    path: '/driver-tracking',
    component: () => import('@/views/DriverTracking.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'employee_admin'] }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  // Skip auth check for login page, payout pages, report pages, and executive dashboard
  if (to.path === '/login' || to.path.startsWith('/payout/') || to.path.startsWith('/report/') || to.path === '/executive' || to.path === '/quick-pickup') {
    next()
    return
  }

  // Check authentication for all routes (not just those with requiresAuth meta)
  if (!userStore.user) {
    await userStore.fetchUser()
  }

  if (!userStore.user) {
    return next('/login')
  }

  // Check role-based authorization for routes that require specific roles
  if (to.meta.requiresAuth && to.meta.roles && !to.meta.roles.includes(userStore.role)) {
    console.log('🚨 Access denied:', {
      path: to.path,
      userRole: userStore.role,
      requiredRoles: to.meta.roles,
      userEmail: userStore.user?.email
    });
    return next('/unauthorized')
  }

  next()
})

export default router
