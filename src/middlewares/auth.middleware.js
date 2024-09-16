import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma/index.js';
import 'dotenv/config';

const SECRET_CODE = process.env.SECRET_CODE;

export default async function (req, res, next) {
    try {
        const authorization = req.headers['authorization'];
        if (!authorization)
            throw new Error('요청한 사용자의 토큰이 존재하지 않습니다.');

        const [tokenType, token] = authorization.split(' ');

        if (tokenType !== 'Bearer')
            throw new Error('토큰타입이 Bearer형식이 아닙니다.');

        let decodedToken;
        try {
            decodedToken = jwt.verify(token, SECRET_CODE);
        } catch (error) {
            throw new Error('유효하지 않거나 만료된 토큰입니다.');
        }

        const userID = decodedToken.userID;
        if (!userID) {
            throw new Error('토큰에서 사용자 ID를 찾을 수 없습니다.');
        }

        const user = await prisma.users.findFirst({
            where: { userID: userID },
        });
        if (!user) throw new Error('토큰 사용자가 존재하지 않습니다.');

        req.user = user;
        next();
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}
