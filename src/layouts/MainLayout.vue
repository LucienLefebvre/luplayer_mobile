<template>
  <q-layout view="hhh lpR fFf">
    <q-header>
      <q-toolbar>
        <q-toolbar-title style="color: orange"> LuPlayer web </q-toolbar-title>
        <q-btn-dropdown color="primary" label="Player mode">
          <q-list>
            <q-item clickable v-close-popup @click="playlistClicked()">
              <q-item-section>
                <q-item-label>Playlist</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="cartClicked()">
              <q-item-section>
                <q-item-label>Cart</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
        <q-btn
          label="reorder"
          @click="toggleReorder"
          :style="{ color: soundsStore.isReordering ? 'red' : 'white' }"
        />
      </q-toolbar>
    </q-header>
    <q-page-container>
      <transition name="page" mode="out-in">
        <router-view />
      </transition>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSoundsStore } from '../stores/sounds-store';
import { useWakeLock } from '@vueuse/core';

const soundsStore = useSoundsStore();
const route = useRoute();
const router = useRouter();

const wakeLock = reactive(useWakeLock());
wakeLock.isActive ? wakeLock.request('screen') : wakeLock.release();
function text() {
  return wakeLock.isActive ? 'OFF' : 'ON';
}
const onClick = () => console.log(wakeLock.isSupported);

onMounted(() => {
  wakeLock.isActive ? wakeLock.request('screen') : wakeLock.release();
  playlistClicked();
});
function cartClicked() {
  router.push('/cart');
  soundsStore.playerMode = 'cart';
}

function playlistClicked() {
  router.push('/playlist');
  soundsStore.playerMode = 'playlist';
}

function toggleReorder() {
  soundsStore.isReordering = !soundsStore.isReordering;
}
</script>

<style>
:root {
  --bkgColor: rgb(50, 62, 68);
  --blueColor: rgb(40, 134, 189);
}
body {
  background-color: rgb(50, 62, 68);
}
</style>
