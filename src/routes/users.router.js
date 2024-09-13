import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import authMiddleware from '../middlewares/auth.middleware.js';


const router = express.Router();

/* 사용자 회원가입 API */
router.post('/sign-up', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const isExistUser = await prisma.users.findFirst({
            where: {
                email,
            },
        });

        if (isExistUser) {
            return res
                .status(409)
                .json({ message: '이미 존재하는 이메일입니다.' });
        }

        // 사용자 비밀번호를 암호화합니다.
        const hashedPassword = await bcrypt.hash(password, 10);

        // Users 테이블에 사용자를 추가합니다.
        const user = await prisma.users.create({
            data: {
                email,
                password: hashedPassword, // 암호화된 비밀번호를 저장합니다.
            },
        });

        return res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    } catch (err) {
        next(err);
    }
});

/* 로그인 API */
router.post('/sign-in', async (req, res, next) => {
    const { email, password } = req.body;

    const user = await prisma.users.findFirst({ where: { email } });

    if (!user) {
        return res.status(401).json({ message: '존재하지 않는 사용자입니다.' });
    }
    if (!(await bcrypt.compare(password, user.password))) {
        return res
            .status(401)
            .json({ message: '비밀번호가 일치하지 않습니다.' });
    }
    const token = jwt.sign({ userId: user.userId }, 'custom-secret-key');

    res.header('authorization', `Bearer ${token}`);
    return res.status(200).json({ message: '로그인에 성공하였습니다.' });
});

router.post('/games/play/:userId', authMiddleware, async (req, res, next) => {
    const userId = req.user;
    const opponentId = req.params;

    const userStat = await prisma.users.findFirst({
        where: { userId: +userId },
        select: {
            stats: true,
        },
    });

    const opponentStat = await prisma.users.findFirst({
        where: { userId: +opponentId },
        select: {
            stats: true,
        },
    });

    //양쪽 팀 불러오기
    const userTeam = await prisma.EquippedPlayers.findMany({
        where : {userId : +userId}
    })

    const opponentTeam = await prisma.EquippedPlayers.findMany({
        where : {userId : +opponentId}
    })

    //양쪽 팀이 3명이 맞는지 확인
    if(gamelogic.checkAbleGame(userTeam, opponentTeam)){
        return res.status(401).json({message : "팀원이 부족합니다."});
    }
    

    // 각각의 가중치 설정 (1 ~ 100)
    const userCondition = Math.floor(Math.random() * 80) + 51;
    const opponentCondition = Math.floor(Math.random() * 80) + 51;

    const scoreA = userStat.stats * userCondition;
    const scoreB = opponentStat.stats * opponentCondition;

    //경기 진행 로직
    gamelogic.startgame(scoreA, scoreB);
    
});

export default router;
