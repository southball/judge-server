use serde::{Serialize, Deserialize};

#[derive(Serialize)]
pub struct JsonResponse<'a, T: Serialize> {
    pub success: bool,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<&'a T>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

pub fn json_ok<T: Serialize>(data: &T) -> JsonResponse<T> {
    JsonResponse {
        success: true,
        data: Some(data),
        message: None
    }
}

pub fn json_error(message: &str) -> JsonResponse<String> {
    JsonResponse {
        success: false,
        data: None,
        message: Some(message.to_string())
    }
}