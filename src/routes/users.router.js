import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import authMiddleware from '../middlewares/auth.middleware.js';

const SECRET_CODE = process.env.SECRET_CODE;


const router = express.Router();

// 회원가입 라우터
router.post('/auth/sign-up', async (req, res, next) => {
    const {
        body: { email, password, name }, // body에서 필요한 데이터 추출
    } = req;
    const validEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/; // 유효한 이메일 형식

    try {
        // 데이터베이스에서 userId에 해당하는 사용자가 있는지 확인
        const isExistUser = await prisma.users.findFirst({
            where: { email },
        });

        // 이메일이 이미 존재하는 경우
        if (isExistUser) {
            return res.status(409).json({
                errorMessage: '이미 존재하는 이메일 입니다.',
            });
        }

        // 아이디 형식이 소문자와 숫자의 조합이 아닌 경우
        if (!validEmail.test(email)) {
            return res.status(400).json({
                errorMessage: '이메일 형식이 아닙니다.',
            });
        }

        // 비밀번호 길이가 6자리 미만인 경우
        if (password.length < 6) {
            return res.status(400).json({
                errorMessage: '비밀번호는 최소 6자리 이상만 가능합니다.',
            });
        }

        const hashedPw = await bcrypt.hash(password, 10); // 비밀번호 해시화

        // 유저 정보 Database 등록
        const user = await prisma.Users.create({
            data: { email, password: hashedPw, name }, // 새로운 사용자 생성
        });

        return res.status(201).json({
            data: {
                userID: user.userID, // 생성된 사용자 번호 반환
                email: user.email, // 생성된 사용자 아이디 반환
                name: user.name, // 생성된 사용자 이름 반환
            },
        });
    } catch (err) {
        console.error(err);
        next(err); // 에러 발생 시 다음 미들웨어로 전달
    }
});

// 로그인 라우터
router.post('/auth/sign-in', async (req, res, next) => {
    const {
        body: { email, password }, // Body에서 userId와 userPw 추출
    } = req;
    try {
        // 데이터베이스에서 userId에 해당하는 사용자가 있는지 확인
        const isExistUser = await prisma.users.findFirst({
            where: { email },
        });

        // 사용자가 존재하지 않는 경우
        if (!isExistUser) {
            return res.status(400).json({
                errorMessage: '없는 아이디 입니다.',
            });
        }

        // 비밀번호가 틀린 경우
        if (!(await bcrypt.compare(password, isExistUser.password))) {
            return res.status(401).json({
                errorMessage: '틀린 비밀번호 입니다.',
            });
        }
        const token = jwt.sign({ userID: isExistUser.userID }, SECRET_CODE); // JWT 토큰 생성
        res.setHeader('Authorization', `Bearer ${token}`); // 응답 헤더에 토큰 설정
        return res
            .status(200)
            .json({ message: '로그인 성공, 헤더에 토큰값이 반환되었습니다.' }); // 성공 메시지 반환
    } catch (err) {
        console.error(err);
        next(err); // 에러 발생 시 다음 미들웨어로 전달
    }
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
