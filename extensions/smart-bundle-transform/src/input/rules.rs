#[derive(serde::Deserialize)]
pub struct Rules {
    pub b: String,
    pub p: String,
    pub r: String,
    pub n: usize,
    pub d: String,
    pub s: Vec<super::slot::Slot>,
}
