use proc_macro_error::{diagnostic, emit_error, Level};
use quote::quote;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

const ANALYZER_SCRIPT_FILE: &'static str = include_str!("./js/index.js");
const TYPESCRIPT_SCRIPT_FILE: &'static str = include_str!("./js/typescript.js");

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AnalyzerOutput {
    pub types: Vec<Type>,
    pub components: Vec<Component>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Type {
    pub name: String,
    pub properties: Vec<TypeProperty>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TypeProperty {
    #[serde(rename = "intrinsicType")]
    pub intrinsic_type: Option<String>,
    pub name: String,
    pub optional: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Component {
    pub name: String,
    #[serde(rename = "propsName")]
    pub props_name: String,
}

impl AnalyzerOutput {
    pub fn types(&self) -> Vec<Type> {
        let mut types = self.types.clone();
        types.dedup_by_key(|n| n.name.clone());
        types
    }
}

impl TypeProperty {
    pub fn name_ident(&self) -> syn::Ident {
        syn::Ident::new(&self.name, proc_macro2::Span::call_site())
    }

    pub fn rust_type_for_intrinsic_type(&self) -> Option<proc_macro2::TokenStream> {
        self.intrinsic_type
            .as_ref()
            .map(|intrinsic_type| match intrinsic_type.as_ref() {
                "string" => quote! { String },
                "number" => quote! { f64 },
                "boolean" => quote! { bool },
                "any" => quote! { JsValue },
                other => {
                    emit_error!(diagnostic!(
                        proc_macro::Span::call_site(),
                        Level::Error,
                        format!(
                            "reacty_yew: Unable to convert intrinsic type \"{}\" to Rust type",
                            other
                        ),
                    ));
                    quote! {}
                }
            })
    }

    pub fn conversion_to_js_type(&self, prop_name: syn::Ident) -> proc_macro2::TokenStream {
        self.intrinsic_type
            .as_ref()
            .map(|intrinsic_type| match intrinsic_type.as_ref() {
                "string" | "number" | "boolean" => {
                    quote! { JsValue::from_serde(#prop_name).unwrap() }
                }
                "any" => {
                    quote! { #prop_name.to_owned() }
                }
                _ => unimplemented!(),
            })
            .unwrap()
    }
}

pub fn init_js_scripts() {
    let analyzer_script_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("./target/index.js");
    let typescript_script_path =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("./target/typescript.js");

    fs::write(&analyzer_script_path, ANALYZER_SCRIPT_FILE).unwrap();
    fs::write(&typescript_script_path, TYPESCRIPT_SCRIPT_FILE).unwrap();
}

pub fn run_analyzer(path: &str) -> AnalyzerOutput {
    let analyzer_script_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("./target/index.js");
    let input_path = PathBuf::from(path).canonicalize().unwrap();

    let output = Command::new("node")
        .args(&[
            analyzer_script_path.to_string_lossy().as_ref(),
            input_path.to_string_lossy().as_ref(),
        ])
        .output()
        .expect("failed to execute process");

    serde_json::from_slice(&output.stdout).unwrap()
}
