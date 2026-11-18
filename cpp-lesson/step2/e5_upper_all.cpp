#include <iostream>

int main() {
    char ch {};

    while (std::cin >> std::noskipws >> ch) {
        if ('a' <= ch && ch <= 'z')
            ch = ch - 'a' + 'A';

        std::cout << ch;
    }
}
