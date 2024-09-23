import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import gamelogic from '../gamelogic.js'; // 게임 로직 import
import 'dotenv/config';

const router = express.Router();

router.get('/match', authMiddleware, async (req, res, next) => {
    try {
        const { userID } = req.user;

        // 현재 사용자의 정보 및 점수 가져오기
        const currentUser = await prisma.users.findUnique({
            where: { userID: +userID },
            select: { score: true }
        });

        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userScore = currentUser.score;

        // ±10점 범위의 상대방 찾기
        const opponent = await prisma.users.findFirst({
            where: {
                score: {
                    gte: userScore - 10,
                    lte: userScore + 10,
                },
                userID: {
                    not: +userID, // 자신 제외
                }
            },
            select: {
                userID: true,
                score: true,
                name: true,
            }
        });

        if (!opponent) {
            return res.status(404).json({ message: 'No suitable matches found.' });
        }

        // 현재 사용자와 상대방의 팀 정보 가져오기 (EquippedPlayers 테이블 사용)
        const userTeam = await prisma.equippedPlayers.findMany({
            where: { userID: +userID },
            select: { playerID: true, userID: true }
        });

        const opponentTeam = await prisma.equippedPlayers.findMany({
            where: { userID: opponent.userID },
            select: { playerID: true, userID: true }
        });

        // 게임 가능 여부 확인 (양 팀 모두 3명의 플레이어가 있는지 확인)
        if (userTeam.length !== 3 || opponentTeam.length !== 3) {
            return res.status(400).json({ message: 'One or both teams do not have exactly 3 players.' });
        }

        // 두 팀의 총 파워레벨 계산
        const userPower = userTeam.reduce((sum, player) => sum + player.powerLevel, 0);
        const opponentPower = opponentTeam.reduce((sum, player) => sum + player.powerLevel, 0);

        // 게임 시작
        const gameResult = gamelogic.startgame(userPower, opponentPower);

        // 승리한 유저 판단 및 점수 업데이트
        let winnerID;
        if (gameResult.startsWith("A 유저 승리")) {
            winnerID = userID; // 현재 사용자가 승리
        } else if (gameResult.startsWith("B 유저 승리")) {
            winnerID = opponent.userID; // 상대방 사용자가 승리
        }

        // 승리한 유저의 점수 업데이트 (+5점 예시)
        await prisma.users.update({
            where: { userID: winnerID },
            data: { score: { increment: 5 } } // 점수를 5점 증가시킴
        });

        return res.status(200).json({
            message: 'Game completed',
            result: gameResult,
            userTeam: userTeam,
            opponentTeam: opponentTeam,
            winnerID: winnerID,
        });

    } catch (error) {
        next(error);
    }
});

export default router;
