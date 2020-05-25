import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { User } from '@/models';
import { AppState } from '../app-state';
import { Permissions } from '.';

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

  private static generateAccessToken(
    username: string,
    permissions: string[],
    key: string
  ): string {
    return jwt.sign({ username, permissions, refresh: false }, key, {
      expiresIn: '20 minutes',
    });
  }

  private static generateRefreshToken(
    username: string,
    permissions: string[],
    key: string
  ): string {
    return jwt.sign({ username, permissions, refresh: true }, key, {
      expiresIn: '7 days',
    });
  }

  public static forUser(
    username: string,
    permissions: string[],
    key: string
  ): JWTTokenPair {
    return new JWTTokenPair(
      JWTTokenPair.generateRefreshToken(username, permissions, key),
      JWTTokenPair.generateAccessToken(username, permissions, key)
    );
  }

  // Uses the refresh token to generate a new access token. Returns false if it fails to do so.
  public async refresh(key: string): Promise<boolean> {
    const { pool } = AppState.get();

    try {
      const { refresh, username } = jwt.verify(
        this.refreshToken,
        key
      ) as JWTTokenPayload;

      if (refresh !== true) return false;
      if (typeof username !== 'string' || username.length === 0) return false;

      // TODO verify username is valid
      const result = await pool.query(`SELECT * FROM Users WHERE username=$1`, [
        username,
      ]);

      if (result.rowCount === 0) {
        return false;
      }

      const user = result.rows[0] as User;

      this.accessToken = JWTTokenPair.generateAccessToken(
        username,
        user.permissions,
        key
      );
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }
}

export const userIs = (permission: string, user?: User): boolean =>
  user?.permissions.includes(permission) ?? false;
export const userIsAdmin = (user?: User): boolean =>
  userIs(Permissions.ADMIN, user);
