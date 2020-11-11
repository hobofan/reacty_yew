#![recursion_limit = "512"]
use reacty_yew::react_component_mod;

mod app;
react_component_mod!(
    bad_button;
    types = "../js_package/dist/index.d.ts",
    global = "BadButtonLib"
);

// This is the entry point for the web app
fn main() {
    set_panic_hook();
    wasm_logger::init(wasm_logger::Config::default());
    yew::start_app::<app::App>();
}

pub fn set_panic_hook() {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    console_error_panic_hook::set_once();
}
