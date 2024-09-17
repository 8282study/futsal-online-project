import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import authMiddleware from '../middlewares/auth.middleware.js';
import 'dotenv/config';

const SECRET_CODE = process.env.SECRET_CODE;
const router = express.Router();

router.post('/gacha', authMiddleware, async (req, res, next) => {
    try {
        const { userID } = req.user; // 로그인한 사용자 정보에서 userId 추출
        
        // PlayerList에서 랜덤으로 하나의 캐릭터를 선택
        const post1 = await prisma.PlayerList.findFirst({
            orderBy: {
                // 랜덤으로 정렬
                playerID: 'asc'
            },
            skip: Math.floor(Math.random() * await prisma.PlayerList.count()) // 랜덤한 characterId 추출
        });

        // 만약 찾은 캐릭터가 없을 경우
        if (!post1) {
            return res.status(404).json({ error: "No character found" });
        }

        // EquippedPlayer에 데이터를 추가
        const post = await prisma.EquippedPlayer.create({
            data: {
                playerID: post1.playerID, // 선택한 캐릭터의 characterId
                playerName: post1.playerName,               // 선택한 캐릭터의 name
                speed:post1.speed,
                finishing:post1.finishing,
                shootPower:post1.shootPower,
                defense:post1.defense,
                stamina:post1.stamina
            }
        });


        return res.status(201).json({ data: post }); // 성공적으로 추가된 데이터 반환
    } catch (error) {
        next(error); // 에러 발생 시 다음 미들웨어로 에러 전달
    }
});


export default router;