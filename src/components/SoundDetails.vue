<template>
  <q-card class="soundDetailsBackground">
    <div class="column q-pa-md justify-center">
      <div class="soundName" :style="{ color: getWaveformColor() }">
        {{ sound.name }}
      </div>
      <div style="height: 10px"></div>
      <div class="row justify-center">
        <q-slider
          vertical
          reverse
          label
          :label-value="sound.trimGain + 'dB'"
          label-always
          switch-label-side
          markers
          :marker-labels="sliderLabelArray"
          v-model="sound.trimGain"
          :min="-24"
          :max="24"
          :step="0.1"
          track-size="8px"
          thumb-size="25px"
          color="orange"
        />
      </div>
      <div style="height: 10px"></div>
      <sound-waveform :sound="sound" style="width: 100%" />
      <q-btn
        label="delete"
        color="red"
        @click="soundsStore.deleteSound(sound)"
      />
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { PropType, ref, watch } from 'vue';
import { useSoundsStore } from '../stores/example-store';
import { SoundModel } from './models';
import SoundWaveform from './SoundWaveform.vue';
import { dbToGain } from '../composables/math-helpers';
const soundsStore = useSoundsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: true },
});

const sound = ref(props.sound);

watch(
  () => sound.value.trimGain,
  (newValue) => {
    sound.value.trimGainNode.gain.value = dbToGain(newValue);
  }
);

function getWaveformColor() {
  if (sound.value.isPlaying) {
    return 'green';
  } else if (sound.value.isSelected) {
    return 'orange';
  } else {
    return 'rgb(40, 134, 189)';
  }
}

interface SliderLabel {
  value: number;
  label: string;
}
const sliderLabelArray: SliderLabel[] = [
  { value: -24, label: '-24dB' },
  { value: 0, label: '0dB' },
  { value: 24, label: '24dB' },
];
</script>

<style scoped>
.soundName {
  text-align: center;
  font-size: 1rem;
  text-overflow: ellipsis;
  widows: 100%;
}
.soundDetailsBackground {
  border: 1px solid;
  border-radius: 10px;
  border-color: 'orange';
  background-color: var(--bkgColor);
}
</style>
