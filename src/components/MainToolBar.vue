<template>
  <div>
    <q-toolbar class="bg-accent">
      <div style="display: flex; align-items: center">
        <img
          src="src\assets\icon.png"
          style="height: 30px; width: auto; object-fit: contain"
        />
      </div>
      <q-toolbar-title> </q-toolbar-title>
      <q-btn-dropdown
        flat
        :label="soundsStore.playerMode"
        class="q-mr-sm"
        style="color: var(--blueColor)"
      >
        <q-list class="bg-primary">
          <q-item clickable v-close-popup @click="playlistClicked()">
            <q-item-section>
              <q-item-label style="color: white">Playlist</q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="cartClicked()">
            <q-item-section>
              <q-item-label style="color: white">Cart</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>

      <q-btn
        class="q-mr-sm"
        flat
        round
        dense
        icon="low_priority"
        @click="toggleReorder"
        :style="{
          color: soundsStore.isReordering ? 'red' : 'var(--blueColor)',
        }"
      />
      <q-btn
        class="q-mr-sm"
        flat
        round
        dense
        icon="settings"
        style="color: var(--blueColor)"
      />
    </q-toolbar>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSoundsStore } from '../stores/sounds-store';

const soundsStore = useSoundsStore();
const router = useRouter();

onMounted(() => {
  playlistClicked();
});
function cartClicked() {
  router.push('/cart');
  soundsStore.initializeCartPlayer();
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

<style scoped></style>
