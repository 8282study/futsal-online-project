import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import 'dotenv/config';

const SECRET_CODE = process.env.SECRET_CODE;
const router = express.Router();

// src/routes/posts.router.js

/** 게시글 목록 조회 API **/
router.get('/character', async (req, res, next) => {
    const posts = await prisma.PlayerList.findMany({
      select: {
        playerName: true,
      },
      orderBy: {
        createdAt: 'desc', // 게시글을 최신순으로 정렬합니다.
      },
    });
  
    return res.status(200).json({ data: posts });
  });

export default router;