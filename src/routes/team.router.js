// /**담당자: 김성록 */
import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/auth/createTeam', authMiddleware, async (req, res, next) => {
    const { userID, playerID, powerLevel } = req.body;

    const checkID = await prisma.ownedPlayers.findFirst({
        where: {
            userID: userID,
            playerID: playerID,
            powerLevel: powerLevel,
        },
    });

    if (checkID) {
        console.log('보유한 선수입니다.');
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

                const playerStat = await prisma.playersList.findFirst({
                    where: {
                        playerID: playerID,
                    },
                    select: {
                        speed: true,
                        finishing: true,
                        shootPower: true,
                        defense: true,
                        stamina: true,
                    },
                });

                const userStat = await prisma.users.findFirst({
                    where: {
                        userID: userID,
                    },
                    select: {
                        stats: true,
                    },
                });

                let totalStat =
                    userStat.stats +
                    playerStat.speed +
                    playerStat.finishing +
                    playerStat.shootPower +
                    playerStat.defense +
                    playerStat.stamina;

                const addStat = await prisma.users.update({
                    where: {
                        userID: userID,
                    },
                    data: {
                        stats: totalStat,
                    },
                });

                return res.status(201).json({ newEquippedPlayer });
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
    const { userID, playerID } = req.body;

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

            //선수 해제시 stat 감소

            const playerStat = await prisma.playersList.findFirst({
                where: {
                    playerID: playerID,
                },
                select: {
                    speed: true,
                    finishing: true,
                    shootPower: true,
                    defense: true,
                    stamina: true,
                },
            });

            const userStat = await prisma.users.findFirst({
                where: {
                    userID: userID,
                },
                select: {
                    stats: true,
                },
            });

            let totalStat =
                userStat.stats -
                playerStat.speed -
                playerStat.finishing -
                playerStat.shootPower -
                playerStat.defense -
                playerStat.stamina;

            const subStat = await prisma.users.update({
                where: {
                    userID: userID,
                },
                data: {
                    stats: totalStat,
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
