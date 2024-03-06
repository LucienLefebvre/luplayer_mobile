# LuPlayer mobile
LuPlayer Mobile is a lightweight adaptation of LuPlayer Desktop, an application designed for playing audio for radio, podcasts, or any other purpose.

Key features include:

- Playlist and cart mode
- Peak meter
- Waveform display
- Volume control with a fader
- Trim gain for each sound
- Normalization in Loudness Unit (LU)
- In & Out points
- Envelope points
- Fade in & out
- Save and load playlists
## Build instructions :

This app is made with Vue and Quasar

### Install the dependencies

```bash
yarn
# or
npm install
```

### Heavy processing tasks are executed by Rust compiled to WebAssembly (Wasm).
#### Install Cargo if it's not already installed.
#### Go to the Rust folder
```bash
src\rust\waveform_process
```
#### Install wasm-pack
```bash
cargo install wasm-pack
```
#### Build the rust library
```bash
wasm-pack build --target web --out-name waveform_process
```

### Now run in the root folder
```bash
quasar dev
# or
quasar dev -m pwa
# or
...
```
#### If you have this error :
```bash
Unexpected empty function '__wbg_init_memory'
```
### Go to
```bash
src\rust\waveform_process\pkg\waveform_process.js
```
### Find the function
```bash
__wbg_init_memory(imports, maybe_memory)
```
### And fill it with something, for example :
```bash
function __wbg_init_memory(imports, maybe_memory) {
  let memory;
}
```
