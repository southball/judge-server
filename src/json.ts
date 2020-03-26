export interface JsonOk<T> {
    success: true;
    data?: T;
}

export interface JsonErr<T> {
    success: false;
    message: string;
    additionalInformation?: T;
}

export function Ok<T = void>(data?: T): JsonOk<T> {
    if (typeof data === 'undefined') {
        return {success: true};
    } else {
        return {success: true, data};
    }
}

export function Err<T = void>(message: string, additionalInformation?: T): JsonErr<T> {
    if (typeof additionalInformation === 'undefined') {
        return {success: false, message};
    } else {
        return {success: false, message, additionalInformation};
    }
}
