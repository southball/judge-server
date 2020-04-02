import {Transform} from 'class-transformer';
import {IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches, MinLength} from 'class-validator';
import {Request, Response, Router} from 'express';
import {AppState} from '../app-state';
import {JWTTokenPair, SaltedHash} from '../auth';
import {Err, Ok} from '../json';
import {User} from '../models';
import {bodySingleTransformerMiddleware} from '../validation';

export function authRouter(): Router {
    const router = Router();

    router.post('/auth/register',
        bodySingleTransformerMiddleware(RegisterProps),
        register);
    router.post('/auth/login',
        bodySingleTransformerMiddleware(LoginProps),
        login);
    router.post('/auth/refresh',
        bodySingleTransformerMiddleware(RefreshProps),
        refresh);

    return router;
}

class RegisterProps {
    @Length(6, 128)
    @Transform((username) => username.toLowerCase())
    @Matches(/^[A-Za-z0-9_]*$/, {
        message: 'username must containing alphanumeric characters and underscore only.',
    })
    username: string;

    @MinLength(8)
    password: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsNotEmpty()
    display_name: string;
}

async function register(req: Request, res: Response): Promise<void> {
    const {pool} = AppState.get();
    const {username, display_name, password, email} = req.body as RegisterProps;

    const saltedHash = new SaltedHash();
    saltedHash.generate(password);

    // Check that the user does not already exist.
    {
        const user = await pool.query('SELECT * FROM Users WHERE username = $1', [username]);

        if (user.rowCount !== 0) {
            res.status(400).json(Err('The username is already used.'));
            return;
        }
    }

    try {
        const result = await pool.query(
                `
                    INSERT INTO Users (username, display_name, email, password_salt, password_hash, permissions)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *
            `,
            [
                username,
                display_name,
                email,
                saltedHash.salt,
                saltedHash.hash,
                [],
            ],
        );

        if (result.rowCount === 1) {
            res.json(Ok());
        } else {
            throw new Error('Expected result.rowCount to be 1.');
        }
    } catch (err) {
        console.error(err);
        res.status(500).json(Err('Failed to register the user.'));
    }
}

class LoginProps {
    @IsString()
    @Transform((username) => username.toLowerCase())
    username: string;
    
    @IsString()
    password: string;
}

async function login(req: Request, res: Response): Promise<void> {
    const {pool, key} = AppState.get();
    const {username, password} = req.body as LoginProps;
    const err = Err('Wrong username or password.');

    const result = await pool.query(
        'SELECT * FROM Users WHERE username=$1',
        [username]
    );

    if (result.rowCount === 0) {
        res.json(err);
        return;
    }

    const user = result.rows[0] as Partial<User>;
    const saltedHash = new SaltedHash(user.password_salt, user.password_hash);

    if (!saltedHash.verify(password)) {
        res.json(err);
        return;
    }

    // Generate token
    const jwt = JWTTokenPair.forUser(user.username, user.permissions,key);
    res.json(Ok(jwt.toJSON()));
}

class RefreshProps {
    @IsNotEmpty()
    refresh_token: string;
}

async function refresh(req: Request, res: Response): Promise<void> {
    const {key} = AppState.get();
    const {refresh_token} = req.body as RefreshProps;

    console.log(req.body);

    const jwt = new JWTTokenPair(refresh_token);
    if (!await jwt.refresh(key)) {
        res.json(Err('Failed to refresh the token.'));
        return;
    }

    res.json(Ok(jwt.toJSON()));
}

export default authRouter;
