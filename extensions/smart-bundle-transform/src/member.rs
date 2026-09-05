pub struct Member<'a> {
    pub line: &'a crate::input::line::Line,
    pub rules: &'a crate::input::rules::Rules,
    pub slots: Vec<&'a crate::input::slot::Slot>,
    pub marker: crate::marker::Marker,
    pub quantity: u64,
    pub count: u64,
}
