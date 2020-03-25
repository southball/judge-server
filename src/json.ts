export interface JsonOk<T> {
    success: true;
    data?: T;
}

export interface JsonError {
    success: false;
    message: string;
}

export function Ok<T = void>(data?: T): JsonOk<T> {
    if (typeof data === 'undefined') {
        return { success: true };
    } else {
        return { success: true, data };
    }
}

export function Err(message: string): JsonError {
    return { success: false, message };
}
