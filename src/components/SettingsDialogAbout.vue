<template>
  <div class="about-panel">
    <div>LuPlayer mobile v0.1</div>
    <div>Developped by Lucien Lefebvre</div>
    <div>Source code available on GitHub</div>
    <div>contact@luplayer.org</div>
    <div>Desktop version available on luplayer.org</div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.about-panel {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  padding: 10px;
  border: 0px;
  text-align: center;
  font-size: large;
  background-color: var(--bkgColor);
}

.about-panel div:nth-child(odd) {
  color: orange;
  padding-top: 5px;
}

.about-panel div:nth-child(even) {
  color: var(--blueColor);
}
</style>
