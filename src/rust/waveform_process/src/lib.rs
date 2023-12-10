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
/*  pub fn calculate_waveform_chunks(channel_data: Vec<f32>, window_size: usize) -> Vec<f32> {
    let mut chunks = Vec::new();
    let number_of_chunks = (channel_data.len() as f64 / window_size as f64).ceil() as usize;
    let channel_data_length = channel_data.len();
    let mut max = f32::NEG_INFINITY;

    for i in 0..number_of_chunks {
        let start = i * window_size;
        for j in 0..window_size {
            if start + j >= channel_data_length {
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
} */

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

#[wasm_bindgen]
  pub fn calculate_y_value_array_from_chunks_windowed_overlap(
    global_waveform_chunks: Vec<f32>,
    start_time: f32,
    end_time: f32,
    sound_duration: f32,
    stage_width: usize,
    overlap_factor: f32,
) -> Vec<f32> {
    // Calculate indices based on time parameters
    let start_index = (global_waveform_chunks.len() as f32 * (start_time / sound_duration)).floor() as f32;
    let end_index = (global_waveform_chunks.len() as f32 * (end_time / sound_duration)).floor() as f32;

    // Clip indices to ensure they are within valid range
    let clipped_start_index = (global_waveform_chunks.len() as f32 * (start_time.max(0.0) / sound_duration)).floor() as f32;
    let clipped_end_index = (global_waveform_chunks.len() as f32 * (end_time.min(sound_duration) / sound_duration)).floor() as f32;

    // Create a clipped version of the waveform
    let mut clipped_waveform_chunks = global_waveform_chunks[clipped_start_index as usize..clipped_end_index as usize].to_vec();

    // Zero-pad the waveform if needed
    if start_index < 0.0 {
        let zeroed_chunks = vec![0.0; start_index.abs() as usize];
        clipped_waveform_chunks.splice(0..0, zeroed_chunks);
    }
    if end_index > global_waveform_chunks.len() as f32 {
        let zeroed_chunks = vec![0.0; end_index as usize - global_waveform_chunks.len()];
        clipped_waveform_chunks.extend(zeroed_chunks);
    }

    // Calculate the size of each display chunk and the overlap size
    let display_chunk_size = (clipped_waveform_chunks.len() as f32 / stage_width as f32).floor() as usize;
    let overlap_size = (display_chunk_size as f32 * overlap_factor) as usize;

    // Initialize variables for tracking maximum values
    let mut last_max = 0.0;
    let mut chunks = Vec::with_capacity(stage_width);

    // Iterate over the stage width to create windowed chunks with overlap
    for i in 0..stage_width {
        // Determine the start and end indices for the current display chunk with overlap
        let start = i * (display_chunk_size - overlap_size);
        let end = start + display_chunk_size;

        // Extract the current chunk from the clipped waveform
        let current_chunk = &clipped_waveform_chunks[start..end];

        // Apply a window function (Hann window in this case)
        let windowed_chunk: Vec<f32> = current_chunk
            .iter()
            .zip((0..current_chunk.len()).rev())
            .map(|(&sample, rev_idx)| sample * 0.5 * (1.0 - ((2.0 * std::f32::consts::PI * rev_idx as f32) / (display_chunk_size - 1) as f32).cos()))
            .collect();

        // Find the maximum value in the windowed chunk
        let max_value = windowed_chunk.iter().copied().fold(f32::NEG_INFINITY, f32::max);

        // Use the maximum value if it is finite, otherwise, use the last maximum value
        let actual_value = if max_value.is_finite() { max_value } else { last_max };

        // Store the actual value in the result vector
        chunks.push(actual_value);

        // Update the last_max variable for the next iteration
        last_max = actual_value;
    }

    // Return the resulting vector of windowed chunks with overlap
    chunks
}
