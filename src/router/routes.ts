import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/IndexPage.vue') }],
  },
  {
    path: '/playlist',
    component: () => import('components/PlayListScreen.vue'),
  },
  {
    path: '/soundDetails',
    component: () => import('components/SoundDetails.vue'),
  },
  {
    path: '/cart',
    component: () => import('components/CartScreen.vue'),
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
