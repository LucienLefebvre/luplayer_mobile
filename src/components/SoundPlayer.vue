<template>
  <q-card
    class="soundBackground"
    style="width: 100%"
    :style="{
      borderColor: getWaveformColor(),
    }"
  >
    <div class="column d-flex flex-center" style="width: 100%">
      <sound-waveform :sound="sound" style="width: 100%" />
      <div class="soundName" :style="{ color: getWaveformColor() }">
        {{ props.sound.name }}
      </div>
    </div>
  </q-card>

  <q-dialog v-model="editWindow">
    <q-btn icon="close" color="white" flat round dense v-close-popup />
    <sound-details :sound="sound" />
  </q-dialog>
</template>

<script setup lang="ts">
import { PropType, ref, watch } from 'vue';
import { SoundModel } from './models';
import { useSoundsStore } from '../stores/sounds-store';
import SoundDetails from './SoundDetails.vue';
import SoundWaveform from './SoundWaveform.vue';

const soundsStore = useSoundsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: true },
});

const sound = ref(props.sound);

const soundInterface = soundsStore.sounds.find((s) => s.id === sound.value.id);

function getWaveformColor() {
  if (soundInterface?.isPlaying) {
    return 'green';
  } else if (soundInterface?.isSelected) {
    return 'orange';
  } else {
    return 'rgb(40, 134, 189)';
  }
}

const editWindow = ref(false);
</script>

<style scoped>
.soundBackground {
  border: 1px solid;
  border-radius: 10px;
  border-color: 'orange';
  background-color: var(--bkgColor);
}
.soundName {
  max-width: 300px;
  text-align: center;
  font-size: 1rem;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
