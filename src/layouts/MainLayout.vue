<template>
  <q-layout view="hhh lpR fFf">
    <q-header>
      <MainToolBar />
    </q-header>
    <q-page-container>
      <transition name="page" mode="out-in">
        <router-view />
      </transition>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import MainToolBar from 'src/components/MainToolBar.vue';
import { useWakeLock } from '@vueuse/core';
import { onMounted } from 'vue';

onMounted(() => {
  const wakeLock = useWakeLock();

  if (!wakeLock.isSupported) console.log('Wake Lock API not supported');
  else console.log('Wake Lock API supported');

  wakeLock.request('screen');
});
</script>

<style>
html {
  overflow: hidden;
  overscroll-behavior: none;
}
:root {
  --bkgColor: rgb(50, 62, 68);
  --blueColor: rgb(40, 134, 189);
}
body {
  background-color: rgb(50, 62, 68);
}
</style>
