import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import authMiddleware from '../middlewares/auth.middleware.js';

const SECRET_CODE = process.env.SECRET_CODE;
const PEPPER = process.env.PEPPER;

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
        const combinedPw = password + PEPPER; // 패스워드 페퍼 적용
        const hashedPw = await bcrypt.hash(combinedPw, 10); // 페퍼 컴바인 된 비밀번호 해시화

        // 유저 정보 Database 등록
        const user = await prisma.users.create({
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
        body: { email, password }, // Body에서 email과 password 추출
    } = req;
    try {
        // 데이터베이스에서 email에 해당하는 사용자가 있는지 확인
        const isExistUser = await prisma.users.findFirst({
            where: { email },
            select: {
                email: true,
                password: true,
                userID: true,
            },
        });

        // 사용자가 존재하지 않는 경우
        if (!isExistUser) {
            return res.status(404).json({
                errorMessage: '없는 아이디 입니다.',
            });
        }

        // 비밀번호가 틀린 경우
        const combinedPw = password + PEPPER;
        if (!(await bcrypt.compare(combinedPw, isExistUser.password))) {
            return res.status(401).json({
                errorMessage: '틀린 비밀번호 입니다.',
            });
        }

        // JWT 토큰 생성
        const token = jwt.sign({ userID: isExistUser.userID }, SECRET_CODE, {
            expiresIn: '1h', // 토큰 만료 시간 1시간으로 설정
        });

        // 리프레쉬 토큰 사용여부 확인해야 함.

        // 응답 헤더에 토큰 설정
        res.setHeader('Authorization', `Bearer ${token}`);

        // 로그인 성공 메시지와 함께 토큰 반환
        return res.status(200).json({
            message: '로그인 성공, 헤더에 토큰값이 반환되었습니다.',
            token,
        });
    } catch (err) {
        console.error(err);
        next(err); // 에러 발생 시 다음 미들웨어로 전달
    }
});

// 비밀번호 수정 라우터
router.patch('/user/password', authMiddleware, async (req, res, next) => {
    const {
        body: { oldPassword, newPassword },
        user: { userID },
    } = req; // body, user 에서 데이터 추출

    // 파라미터 검증
    if (oldPassword.length < 6 || newPassword.length < 6)
        return res
            .status(400)
            .json({ errorMessage: '비밀번호는 6자리 이상입니다.' });

    try {
        const user = await prisma.users.findFirst({
            where: { userID },
            select: { password: true },
        });

        if (!user)
            res.status(500).json({
                errorMessage:
                    ' 서버 오류로 인한 유저정보 획득에 실패하였습니다.',
            });

        const combinedPw = oldPassword + PEPPER; // 기존 비밀번호와 비교하기 위하여 페퍼 적용
        if (!(await bcrypt.compare(combinedPw, user.password))) {
            return res.status(401).json({
                errorMessage: '기존 비밀번호와 일치하지 않습니다.',
            });
        }
        const combinedNewPw = newPassword + PEPPER; // 페퍼 적용
        const hashedPw = await bcrypt.hash(combinedNewPw, 10); // 페퍼 컴바인 된 비밀번호 해시화

        // 데이터베이스 적용
        await prisma.users.update({
            where: { userID },
            data: { password: hashedPw },
        });

        return res.status(200).json({ message: '비밀번호 변경 완료' });
    } catch (err) {
        console.error(err);
        next(err);
    }
});

// 캐시충전 라우터
router.patch('/user/cash/:amount', authMiddleware, async (req, res, next) => {
    const {
        params: { amount },
        user: { userID },
    } = req;

    // 파라미터 검증
    const amountToNumber = Number(amount);

    if (isNaN(amountToNumber)) {
        return res.status(400).json({
            errorMessage: '파라미터 값이 숫자형식이 아닙니다.',
        });
    }

    if (amountToNumber <= 0) {
        return res.status(400).json({
            errorMessage: '양수 값만 입력할 수 있습니다.',
        });
    }

    try {
        // 2차 유저 존재여부 검증 후 데이터베이스 변경 관련 트랜잭션
        const changedUser = await prisma.$transaction(async (tx) => {
            const user = await tx.users.findUnique({ where: { userID } });
            if (!user) throw new Error('사용자를 찾을 수 없습니다.');

            return tx.users.update({
                where: { userID },
                data: { cash: user.cash + amountToNumber },
            });
        });
        // 성공 시 성공 메세지 반환
        return res.status(200).json({
            message: `${amount}원 충전 성공.`,
            data: { currentCashBalance: changedUser.cash },
        });
    } catch (err) {
        console.error('캐시 충전 중 에러 발생:', err);
        next(err); // 에러 발생 시 다음 미들웨어로 전달
    }
});

// 캐시 잔액 조회
router.get('/user/cash', authMiddleware, async (req, res, next) => {
    try {
        const { cash } = req.user;

        // cash 값이 없을 경우 예외 처리
        if (cash === undefined || cash === null) {
            return res.status(400).json({
                errorMessage: '잔액 조회 중 오류가 발생하였습니다.',
            });
        }
        // 조회 성공 시 메세지와 balance 반환
        res.status(200).json({
            message: '잔액 조회 성공',
            data: { balance: cash },
        });
    } catch (err) {
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
        where: { userId: +userId },
    });

    const opponentTeam = await prisma.EquippedPlayers.findMany({
        where: { userId: +opponentId },
    });

    //양쪽 팀이 3명이 맞는지 확인
    if (gamelogic.checkAbleGame(userTeam, opponentTeam)) {
        return res.status(401).json({ message: '팀원이 부족합니다.' });
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
