import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore'

import Home from '@/views/Home.vue'
import Summary from '@/views/Summary.vue'
import Deliveries from '@/components/DeliveryDashboard.vue'
import Unauthorized from '@/views/Unauthorized.vue'
import Account from '@/views/Account.vue'
import Login from '@/views/Login.vue'

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
const routes = [
  { path: '/', component: Home },
  { path: '/account', component: Account },
  { path: '/login', component: Login },

  // 🔐 Dashboards by role
  {
    path: '/payroll',
    name: 'PayrollTabs',
    component: () => import('@/views/PayrollTabs.vue')
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
    component: ExecutiveDashboard,
    meta: { requiresAuth: true, roles: ['executive'] }
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
  // 🔐 Shared/utility routes
  {
    path: '/summary',
    component: Summary,
    meta: { requiresAuth: true, roles: ['admin', 'rider'] }
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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  // Skip auth check for login page to prevent infinite loop
  if (to.path === '/login') {
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
    return next('/unauthorized')
  }

  next()
})

export default router
