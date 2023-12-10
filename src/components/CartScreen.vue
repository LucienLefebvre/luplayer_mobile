<template>
  <div
    class="scrollable-cart"
    :style="{ height: scrollablePlaylistHeight + 'px' }"
  >
    <div class="row">
      <div
        v-for="(draggableObj, index) in draggables"
        :key="index"
        :style="{ width: draggableObj.width, height: 'inherit' }"
      >
        <draggable
          :list="draggableObj.list"
          style="height: 100%"
          :disabled="!soundsStore.isReordering"
          group="sounds"
          item-key="name"
          @start="drag = true"
          @end="drag = false"
          ghost-class="ghost"
          drag-class="dragging"
        >
          <template #item="{ element }">
            <div class="q-px-xs q-py-xs">
              <SoundPlayer :sound="element" />
            </div>
          </template>
        </draggable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable';
import SoundPlayer from './SoundPlayer.vue';
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';
import MetersPanel from './MetersPanel.vue';
import AddSoundButton from './AddSoundButton.vue';
import { ref, onMounted, watch } from 'vue';
const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

let drag = false;

const draggables = [
  {
    width: '50%',
    list: soundsStore.sounds[0],
  },
  {
    width: '50%',
    list: soundsStore.sounds[1],
  },
];

onMounted(() => {
  updateHeight();
});

const scrollablePlaylistHeight = ref(0);
const updateHeight = () => {
  console.log('updateHeight');
  let heightToSubtract = 115;
  const meterHeight = 31;
  if (settingsStore.showPeakMeter) {
    heightToSubtract += meterHeight;
  }
  if (settingsStore.showLuMeter) {
    heightToSubtract += meterHeight;
  }
  console.log('heightToSubtract', heightToSubtract);
  console.log('window.innerHeight', window.innerHeight);
  scrollablePlaylistHeight.value = window.innerHeight - heightToSubtract;
};
watch(
  () => settingsStore.showPeakMeter,
  () => {
    updateHeight();
  }
);

watch(
  () => settingsStore.showLuMeter,
  () => {
    updateHeight();
  }
);
</script>

<style scoped>
.scrollable-cart {
  overflow-y: auto;
}
.ghost {
  background-color: red;
}
</style>
