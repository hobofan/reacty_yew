use yew::prelude::*;

use crate::bad_button::BadButton;

pub struct App {
    // link: ComponentLink<Self>,
}

impl Component for App {
    type Message = ();
    type Properties = ();

    fn create(_: Self::Properties, _link: ComponentLink<Self>) -> Self {
        App {}
    }

    fn change(&mut self, _new_props: Self::Properties) -> ShouldRender {
        true
    }

    fn update(&mut self, _msg: Self::Message) -> ShouldRender {
        true
    }

    fn view(&self) -> Html {
        html! {
            <div>
                <button>{"This button!"}</button>
                <BadButton text="Actual props"/>
            </div>
        }
    }
}
