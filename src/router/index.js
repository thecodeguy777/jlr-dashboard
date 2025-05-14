import { createRouter, createWebHistory } from 'vue-router';
import ChatPage from '../components/ChatPage.vue';
import FormWithLog from '../components/FormWithLog.vue';
import DeliveryDashboard from '../components/DeliveryDashboard.vue';
import DailyReport from '../views/DailyReport.vue';
import Summary from '../views/Summary.vue';  // Import the Summary page

const routes = [
  { path: '/', redirect: '/deliveries', name: 'FormWithLog' }, 
  { path: '/chat', component: ChatPage, name: 'ChatPage' },   
  { path: '/summary', component: Summary, name: 'Summary' }, 
  { path: '/deliveries', component: DeliveryDashboard, name: 'DeliveryDashboard' },
  { path: '/report/daily', component: DailyReport, name: 'DailyReport' }, // Add DailyReport route
 // Add Summary route
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
