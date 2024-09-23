import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import gamelogic from '../gamelogic.js'; // 게임 로직 import
import 'dotenv/config';

const router = express.Router();

router.post('/games/randomplay', authMiddleware, async (req, res, next) => {
    try {
        const { userID } = req.user;

        // 현재 사용자의 정보 및 점수 가져오기
        const currentUser = await prisma.users.findUnique({
            where: { userID: +userID },
            select: { score: true, stats: true, win: true, draw: true, loss: true }
        });

        if (!currentUser) {
            return res.status(404).json({ error: '유저 정보가 없습니다' });
        }

        const userScore = currentUser.score;

        // ±300점 범위의 상대방들 목록 가져오기 (equippedPlayers 테이블에 3명의 선수를 가진 상대만)
        const potentialOpponents = await prisma.users.findMany({
            where: {
                score: {
                    gte: userScore - 300,
                    lte: userScore + 300,
                },
                userID: {
                    not: +userID, // 본인 제외
                },
                equippedPlayers: {
                    some: {} // 선수 정보가 있는 상대만
                },
            },
            include: {
                _count: {
                    select: { equippedPlayers: true }
                }
            }
        });

        // 3명의 선수를 갖춘 상대만 필터링
        const validOpponents = potentialOpponents.filter(opponent => opponent._count.equippedPlayers === 3);

        if (validOpponents.length === 0) {
            return res.status(404).json({ message: '시합을 찾을 수 없습니다.' });
        }

        // 랜덤으로 한 명의 상대 선택
        const randomIndex = Math.floor(Math.random() * validOpponents.length);
        const opponent = validOpponents[randomIndex];

        // 현재 사용자와 상대방의 팀 정보 가져오기
        const userTeam = await prisma.equippedPlayers.findMany({
            where: { userID: +userID },
            select: { playerID: true } 
        });

        const opponentTeam = await prisma.equippedPlayers.findMany({
            where: { userID: opponent.userID },
            select: { playerID: true }
        });

        // 게임 가능 여부 확인 (양 팀 모두 3명의 플레이어가 있는지 확인)
        if (userTeam.length !== 3 || opponentTeam.length !== 3) {
            return res.status(400).json({ message: '양쪽 팀에 3명의 선수가 필요합니다.' });
        }

        // 각각의 가중치 설정 (51 ~ 130 범위)
        const userCondition = Math.floor(Math.random() * 80) + 51;
        const opponentCondition = Math.floor(Math.random() * 80) + 51;

        // 각 유저의 점수와 가중치 반영
        const scoreA = currentUser.stats * userCondition;
        const scoreB = opponent.stats * opponentCondition;

        // 경기 진행 로직
        const result = gamelogic.startgame(scoreA, scoreB);
        console.log(result);

        // 결과에 따른 점수 업데이트 및 승/패 처리
        const isUserWinner = result[0] === 'A';
        const scoreChange = 10;

        const userUpdateData = {
            score: isUserWinner ? currentUser.score + scoreChange : currentUser.score - scoreChange,
            win: isUserWinner ? currentUser.win + 1 : currentUser.win,
            loss: !isUserWinner ? currentUser.loss + 1 : currentUser.loss
        };

        const opponentUpdateData = {
            score: isUserWinner ? opponent.score - scoreChange : opponent.score + scoreChange,
            win: !isUserWinner ? opponent.win + 1 : opponent.win,
            loss: isUserWinner ? opponent.loss + 1 : opponent.loss
        };

        // 데이터베이스 업데이트
        await prisma.users.update({
            where: { userID: +userID },
            data: userUpdateData
        });

        await prisma.users.update({
            where: { userID: +opponent.userID },
            data: opponentUpdateData
        });

        // resultteam 추가: 승리와 패배 정보를 포함하여 응답
        const resultteam = {
            winner: isUserWinner ? userID : opponent.userID,
            loser: isUserWinner ? opponent.userID : userID
        };

        return res.status(200).json({ 
            message: '게임이 완료되었습니다.', 
            result: result,
            resultteam: resultteam // 승패 정보 포함
        });

    } catch (error) {
        console.error('에러 발생:', error);
        next(error);
    }
});

export default router;
