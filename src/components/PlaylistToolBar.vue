<template>
  <div class="playlist-toolbar">
    <q-btn round dense icon="skip_previous" class="icon" size="1.2rem" />
    <q-btn
      round
      dense
      icon="skip_previous"
      class="rotate-icon icon"
      size="1.2rem"
    />
    <q-btn round dense icon="skip_next" class="icon" size="1.2rem" />
    <q-btn round dense class="icon" size="1.2rem">
      <q-icon>
        <template v-slot:default>
          <svg v-html="MyIcon"></svg>
        </template>
      </q-icon>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
const MyIcon = 'src/assets/fad-punch-out.svg';
</script>

<style scoped>
.playlist-toolbar {
  background-color: var(--darkColor);
  border-bottom: 2px solid orange;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  padding: 3px;
}
.rotate-icon {
  transform: rotate(90deg);
}
.icon {
  color: orange;
  background-color: var(--blueColor);
}
</style>
