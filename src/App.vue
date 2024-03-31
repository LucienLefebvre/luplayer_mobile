<template>
  <main-layout />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import MainLayout from './layouts/MainLayout.vue';
import { App } from '@capacitor/app';

export default defineComponent({
  name: 'App',
  components: {
    MainLayout,
  },
});
</script>
