use serde::{Serialize};

#[derive(Serialize)]
pub struct JsonResponse<'a, T: Serialize> {
    pub success: bool,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<&'a T>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

pub fn json_ok<T: Serialize>(data: Option<&T>) -> JsonResponse<T> {
    JsonResponse {
        success: true,
        data,
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