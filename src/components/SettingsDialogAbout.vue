<template>
  <div class="about-panel">
    <div class="centered-icon">
      <img
        src="~assets\icon.png"
        style="height: 30px; width: auto; object-fit: contain"
      />
    </div>
    <div class="blueText">LuPlayer Mobile v0.1</div>
    <br />
    <div class="orangeText">Developed by Lucien Lefebvre</div>
    <br />
    <div class="blueText">
      Source code available on
      <a
        href="https://github.com/LucienLefebvre/luplayer_mobile"
        target="_blank"
        style="color: inherit"
        >GitHub</a
      >
    </div>
    <br />
    <div class="orangeText">
      For suggestions or bug reports, please contact me at
      <a href="mailto:contact@luplayer.org" style="color: inherit"
        >contact@luplayer.org</a
      >
    </div>
    <br />
    <div class="blueText">
      Desktop version available on
      <a href="https://luplayer.org" target="_blank" style="color: inherit"
        >luplayer.org</a
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core';
function isCapacitor() {
  return Capacitor.isNativePlatform();
}
</script>

<style scoped>
.about-panel {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  padding: 10px;
  border: 0px;
  text-align: center;
  font-size: 1.1rem;
  background-color: var(--bkgColor);
}

.orangeText {
  color: orange;
  padding-top: 5px;
}

.blueText {
  color: var(--blueColor);
}
</style>
