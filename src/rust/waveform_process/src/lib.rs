use wasm_bindgen::prelude::*;
use std::cmp;

#[wasm_bindgen]
pub fn calculate_waveform_chunks(channel_data: Vec<f32>, window_size: usize) -> Vec<f32> {
    let mut chunks = Vec::new();
    let number_of_chunks = (channel_data.len() as f64 / window_size as f64).ceil() as usize;

    for i in 0..number_of_chunks {
        let start = i * window_size;
        let _end = std::cmp::min(start + window_size, channel_data.len());

        let mut max = f32::NEG_INFINITY;

        for j in 0..window_size {
            if start + j >= channel_data.len() {
                break;
            }
            let sample_value = channel_data[start + j].abs();
            if sample_value > max {
                max = sample_value;
            }
        }

        chunks.push(max);
    }

    chunks
}


#[wasm_bindgen]
pub fn calculate_y_value_array_from_chunks(
    global_waveform_chunks: Vec<f32>,
    start_time: f64,
    end_time: f64,
    sound_duration: f64,
    stage_width: usize,
) -> Vec<f32> {
    let start_index = (global_waveform_chunks.len() as f64 * (start_time / sound_duration)).floor() as usize;
    let end_index = (global_waveform_chunks.len() as f64 * (end_time / sound_duration)).floor() as usize;

    let mut clipped_waveform_chunks = global_waveform_chunks[start_index..end_index].to_vec();

    if start_index > 0 {
        let zeroed_chunks = vec![0.0; start_index];
        let result = [&zeroed_chunks[..], &clipped_waveform_chunks[..]].concat();
        clipped_waveform_chunks = result;
    }

    let slice_end_padding = end_index.saturating_sub(global_waveform_chunks.len());
    if slice_end_padding > 0 {
        let zeroed_chunks = vec![0.0; slice_end_padding];
        let result = [&clipped_waveform_chunks[..], &zeroed_chunks[..]].concat();
        clipped_waveform_chunks = result;
    }

    let display_chunk_size = clipped_waveform_chunks.len() as f64 / stage_width as f64;

    let mut last_max = 0.0;
    let mut data_array = Vec::new();

    for i in 0..stage_width {
        let start = (i as f64 * display_chunk_size) as usize;
        let end = cmp::min(start + display_chunk_size as usize, clipped_waveform_chunks.len());
        let current_chunk = clipped_waveform_chunks[start..end].to_vec();
        let max = current_chunk.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
        let max = if max.is_finite() { max } else { last_max };
        data_array.push(max);
        last_max = max;
    }

    data_array
}
