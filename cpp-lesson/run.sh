#!/bin/bash
# 使い方: ./run.sh ファイル.cpp [入力ファイル]
# 例: ./run.sh part1/q1.cpp data/test.txt
set -e
SRC="$1"
if [ -z "$SRC" ]; then echo "usage: ./run.sh file.cpp [input.txt]"; exit 1; fi
BIN="/tmp/$(basename "${SRC%.cpp}").out"
g++ -std=c++20 -Wall -Wextra -o "$BIN" "$SRC"
echo "--- コンパイル成功 ---"
if [ -n "$2" ]; then "$BIN" < "$2"; else "$BIN"; fi
