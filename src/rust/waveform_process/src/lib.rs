use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn calculate_waveform_chunks(left_channel_data: Vec<f32>, right_channel_data: Vec<f32>,window_size: usize) -> Vec<f32> {
    let mut chunks = Vec::new();
    let number_of_chunks = (left_channel_data.len() as f64 / window_size as f64).ceil() as usize;

    for i in 0..number_of_chunks {
        let start = i * window_size;
        let _end = std::cmp::min(start + window_size, left_channel_data.len());

        let mut max = f32::NEG_INFINITY;

        for j in 0..window_size {
            if start + j >= left_channel_data.len() {
                break;
            }
            let left_sample_value = left_channel_data[start + j].abs();
            let right_sample_value = right_channel_data[start + j].abs();
            let max_value =  f32::max(left_sample_value, right_sample_value);
            if max_value > max {
                max = max_value;
            }
        }

        chunks.push(max);
    }

    chunks
}

 #[wasm_bindgen]
 pub fn calculate_y_value_array_from_chunks(
    global_waveform_chunks: Vec<f32>,
    start_time: f32,
    end_time: f32,
    sound_duration: f32,
    stage_width: usize,
) -> Vec<f32> {
    let start_index = (global_waveform_chunks.len() as f32 * (start_time / sound_duration)).floor() as f32;
    let end_index = (global_waveform_chunks.len() as f32 * (end_time / sound_duration)).floor() as f32;

    let clipped_start_index =  (global_waveform_chunks.len() as f32 * (start_time.max(0.0) / sound_duration)).floor() as f32;
    let clipped_end_index = (global_waveform_chunks.len() as f32 * (end_time.min(sound_duration) / sound_duration)).floor() as f32;

    let mut clipped_waveform_chunks = global_waveform_chunks[clipped_start_index as usize..clipped_end_index as usize].to_vec();

    if start_index < 0.0{
        let zeroed_chunks = vec![0.0; start_index.abs() as usize];
        clipped_waveform_chunks.splice(0..0, zeroed_chunks);

    }
    if end_index > global_waveform_chunks.len() as f32{
        let zeroed_chunks = vec![0.0; end_index as usize - global_waveform_chunks.len()];
        clipped_waveform_chunks.extend(zeroed_chunks);
    }

    let display_chunk_size = clipped_waveform_chunks.len() as f32 / stage_width as f32;

    let mut last_max = 0.0;
    let mut chunks = Vec::with_capacity(stage_width);

   for i in 0..stage_width{
    let start = (i as f32 * display_chunk_size as f32) as usize;
    let end = start + display_chunk_size as usize;
    let current_chunk = &clipped_waveform_chunks[start..end];

    let max_value = current_chunk.iter().copied().fold(f32::NEG_INFINITY, f32::max);
    let actual_value = if max_value.is_finite() { max_value } else { last_max };

    chunks.push(actual_value);
    last_max = actual_value;
   }

    chunks
}

use ebur128::EbuR128;
#[wasm_bindgen]
pub fn calculate_r128_integrated_loudness(
    left_channel_data: Vec<f32>,
    right_channel_data: Vec<f32>,
    sample_rate: usize,
) -> Result<f64, JsValue> {
    let mut ebu = EbuR128::new(2, sample_rate as u32, ebur128::Mode::I)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    ebu.add_frames_planar_f32(&[&left_channel_data, &right_channel_data])
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let result = ebu.loudness_global()
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    Ok(result)
}
