import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

/**
 * A class to generate SHA-512 salt and hash as hexadecimal strings.
 */
export class SaltedHash {
    // 512 bits = 64 bytes
    public static BYTE_COUNT = 64;
    public static ITERATIONS = 25000;
    public static DIGEST_ALGORITHM = 'sha512';

    public salt: string = '';
    public hash: string = '';

    public constructor(salt: string = '', hash: string = '') {
        this.salt = salt;
        this.hash = hash;
    }

    private static generateHash(password: Buffer, salt: Buffer): Buffer {
        return crypto.pbkdf2Sync(
            password,
            salt,
            SaltedHash.ITERATIONS,
            SaltedHash.BYTE_COUNT,
            SaltedHash.DIGEST_ALGORITHM
        );
    }

    public generate(password: string): void {
        const passwordBuffer = Buffer.from(password);
        const saltBuffer = crypto.randomBytes(SaltedHash.BYTE_COUNT);
        const hashBuffer = SaltedHash.generateHash(passwordBuffer, saltBuffer);

        this.salt = saltBuffer.toString('hex');
        this.hash = hashBuffer.toString('hex');
    }

    public verify(password: string): boolean {
        const passwordBuffer = Buffer.from(password);
        const saltBuffer = Buffer.from(this.salt, 'hex');
        const hashBuffer = SaltedHash.generateHash(passwordBuffer, saltBuffer);

        return this.hash === hashBuffer.toString('hex');
    }
}

export interface JWTTokenPayload {
    username: string;
    refresh: boolean;
}

export interface JWTTokenPairJSON {
    access_token?: string;
    refresh_token?: string;
}

export class JWTTokenPair {
    public accessToken?: string;
    public refreshToken?: string;

    public constructor(refreshToken?: string, accessToken?: string) {
        this.refreshToken = refreshToken;
        this.accessToken = accessToken;
    }

    public toJSON(): JWTTokenPairJSON {
        return {
            access_token: this.accessToken,
            refresh_token: this.refreshToken,
        };
    }

    private static generateAccessToken(username: string, key: string): string {
        return jwt.sign({ username, refresh: false }, key, { expiresIn: '20 minutes' });
    }

    private static generateRefreshToken(username: string, key: string): string {
        return jwt.sign({ username, refresh: true }, key, { expiresIn: '7 days' });
    }

    public static forUser(username: string, key: string): JWTTokenPair {
        return new JWTTokenPair(
            JWTTokenPair.generateRefreshToken(username, key),
            JWTTokenPair.generateAccessToken(username, key),
        );
    }

    // Uses the refresh token to generate a new access token. Returns false if it fails to do so.
    public refresh(key: string): boolean {
        try {
            const {refresh, username} = jwt.verify(this.refreshToken, key) as JWTTokenPayload;

            if (refresh !== true)
                return false;
            if (typeof username !== 'string' || username.length === 0)
                return false;
            // TODO verify username is valid

            this.accessToken = JWTTokenPair.generateAccessToken(username, key);
            return true;
        } catch(err) {
            console.error(err);
            return false;
        }
    }
}
