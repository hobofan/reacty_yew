extern crate proc_macro;

mod analyzer;

use proc_macro::TokenStream;
use quote::quote;
use syn::parse::{Parse, ParseStream};
use syn::Result;

use analyzer::*;

struct MacroInput {
    mod_ident: syn::Ident,
    types_path: String,
    global_name: String,
}

impl Parse for MacroInput {
    fn parse(input: ParseStream) -> Result<Self> {
        let initial_mod_part = input.call(syn::Meta::parse)?;
        input.parse::<syn::Token![;]>()?;
        let parts = input
            .call(syn::punctuated::Punctuated::<syn::Meta, syn::Token![,]>::parse_terminated)?;

        let mod_ident = initial_mod_part.path().get_ident().unwrap().to_owned();

        let mut parts = parts.into_iter();
        let path_part = parts.next().unwrap();
        let global_part = parts.next().unwrap();

        let (types_path, global_name) = match (path_part, global_part) {
            (syn::Meta::NameValue(path), syn::Meta::NameValue(global)) => {
                match (path.lit, global.lit) {
                    (syn::Lit::Str(raw_path), syn::Lit::Str(raw_global)) => {
                        (raw_path.value(), raw_global.value())
                    }
                    _ => unimplemented!(),
                }
            }
            _ => unimplemented!(),
        };

        Ok(MacroInput {
            mod_ident,
            types_path,
            global_name,
        })
    }
}

#[proc_macro]
pub fn react_component_mod(item: TokenStream) -> TokenStream {
    let input = syn::parse_macro_input!(item as MacroInput);
    init_js_scripts();
    let analyzer_output = run_analyzer(&input.types_path);

    let mod_name = input.mod_ident;

    let component_name = analyzer_output.components[0].name.clone();
    let props_name = analyzer_output.components[0].props_name.clone();
    let props_type = analyzer_output.types[0].clone();

    let props_struct = component_props_struct(&props_type);
    let (render_fn_name, render_fn) =
        component_render_function(&input.global_name, &component_name, &props_name);
    let struct_and_impl = component_struct_and_impl(&component_name, &props_name, &render_fn_name);

    let expanded = quote! {
        mod #mod_name {
            use wasm_bindgen::prelude::*;
            use yew::prelude::*;
            use yew::web_sys::{self, Node};
            use yew::virtual_dom::VNode;
            use serde::{Serialize, Deserialize};

            #props_struct

            #struct_and_impl

            #render_fn
        }
    };
    TokenStream::from(expanded)
}

fn component_props_struct(props_type: &Type) -> proc_macro2::TokenStream {
    let props_name = syn::Ident::new(&props_type.name, proc_macro2::Span::call_site());

    let mut struct_fields = quote! {};
    for property in &props_type.properties {
        let field_name = property.name_ident();
        let rust_type = property
            .rust_type_for_intrinsic_type()
            .expect("Unsupported TS intrinsic type");

        let new_struct_field = match property.optional {
            false => {
                quote! {
                    pub #field_name : #rust_type,
                }
            }
            true => {
                quote! {
                    #[prop_or_default]
                    pub #field_name : Option<#rust_type>,
                }
            }
        };

        struct_fields = quote! {
            #struct_fields
            #new_struct_field
        }
    }

    quote! {
        #[derive(Clone, Properties, Serialize, Deserialize)]
        pub struct #props_name {
            #struct_fields
        }
    }
}

fn component_render_function(
    js_lib_name: &str,
    component_name: &str,
    props_name: &str,
) -> (String, proc_macro2::TokenStream) {
    let render_fn_name = format!("render_{}", component_name);
    let render_fn_js_name = format!("render_{}_js", component_name);

    let component_name = syn::Ident::new(&component_name, proc_macro2::Span::call_site());
    let props_name = syn::Ident::new(&props_name, proc_macro2::Span::call_site());

    let render_fn_name_ident = syn::Ident::new(&render_fn_name, proc_macro2::Span::call_site());
    let render_fn_js_name_ident =
        syn::Ident::new(&render_fn_js_name, proc_macro2::Span::call_site());

    let inline_js_script = format!(
        "export function {render_fn_js_name}(node, props) {{ let element = React.createElement({js_lib_name}.{component_name}, props); return ReactDOM.render(element, node); }}",
        js_lib_name=js_lib_name,
        component_name=component_name,
        render_fn_js_name=render_fn_js_name
    );

    let render_fn = quote! {
        fn #render_fn_name_ident(node: &Node, props: &#props_name) {
            #render_fn_js_name_ident(
                node,
                JsValue::from_serde(props).unwrap(),
            );
        }

        #[wasm_bindgen(inline_js = #inline_js_script)]
        extern "C" {
            fn #render_fn_js_name_ident(node: &Node, props: JsValue);
        }
    };

    (render_fn_name, render_fn)
}

fn component_struct_and_impl(
    component_name: &str,
    props_name: &str,
    render_fn_name: &str,
) -> proc_macro2::TokenStream {
    let component_name = syn::Ident::new(&component_name, proc_macro2::Span::call_site());
    let props_name = syn::Ident::new(&props_name, proc_macro2::Span::call_site());
    let render_fn_name = syn::Ident::new(&render_fn_name, proc_macro2::Span::call_site());

    quote! {
        pub struct #component_name {
            node: Node,
            props: #props_name,
        }

        impl Component for #component_name {
            type Message = ();
            type Properties = #props_name;


            fn create(props: Self::Properties, _link: ComponentLink<Self>) -> Self {
                Self {
                    node: Node::from(
                        web_sys::window()
                            .unwrap()
                            .document()
                            .unwrap()
                            .create_element("div")
                            .unwrap(),
                    ),
                    props,
                }
            }

            fn change(&mut self, _new_props: Self::Properties) -> ShouldRender {
                true
            }

            fn update(&mut self, msg: Self::Message) -> ShouldRender {
                true
            }

            fn view(&self) -> Html {
                #render_fn_name(&self.node, &self.props);

                VNode::VRef(self.node.clone())
            }
        }
    }
}
