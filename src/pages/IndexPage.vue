<template>
  <q-layout view="lHh Lpr lFf">
    <SoundPlaylist />
  </q-layout>
</template>

<script setup lang="ts">
import SoundPlaylist from '../components/SoundPlaylist.vue';
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
