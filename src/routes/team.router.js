// /**담당자: 김성록 */
import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/auth/createTeam', authMiddleware, async (req, res, next) => {
    const { userID } = req.user;
    const { playerID } = req.body;

    const checkID = await prisma.ownedPlayers.findFirst({
        where: {
            userID: userID,
            playerID: playerID,
        },
        select: { powerLevel: true },
    });

    if (checkID) {
        const { powerLevel } = checkID;

        try {
            const playerCount = await prisma.equippedPlayers.count({
                where: {
                    userID: userID,
                },
            });

            if (playerCount < 3) {
                const newEquippedPlayer = await prisma.equippedPlayers.create({
                    data: {
                        userID: userID,
                        playerID: playerID,
                        powerLevel: powerLevel,
                    },
                });
                return res.status(201).json({ newEquippedPlayer, powerLevel });
            } else {
                return res
                    .status(400)
                    .json({ errorMessage: '팀은 최대 3명까지만 가능합니다.' });
            }
        } catch (error) {
            console.error('오류:', error);
            return res
                .status(500)
                .json({ errorMessage: '서버 오류가 발생했습니다.' });
        }
    } else {
        console.log('새로운 선수입니다.');
        return res
            .status(400)
            .json({ errorMessage: '플레이어가 보유되지 않았습니다.' });
    }
});

router.delete('/auth/deleteTeam', authMiddleware, async (req, res, next) => {
    const { userID } = req.user;
    const { playerID } = req.body;

    if (!userID || !playerID) {
        return res
            .status(400)
            .json({ errorMessage: 'userID 또는 playerID가 누락되었습니다.' });
    }

    try {
        const existingPlayer = await prisma.equippedPlayers.findFirst({
            where: {
                userID: userID,
                playerID: playerID,
            },
        });

        if (existingPlayer) {
            const deletedPlayer = await prisma.equippedPlayers.delete({
                where: {
                    userID_playerID: {
                        userID: userID,
                        playerID: playerID,
                    },
                },
            });
            return res.status(200).json({ deletedPlayer });
        } else {
            return res
                .status(404)
                .json({ errorMessage: '삭제할 팀원이 존재하지 않습니다.' });
        }
    } catch (error) {
        console.error('오류:', error);
        return res
            .status(500)
            .json({ errorMessage: '서버 오류가 발생했습니다.' });
    }
});

export default router;
