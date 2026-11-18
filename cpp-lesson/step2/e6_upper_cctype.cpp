#include <iostream>
#include <cctype>

int main() {
    char ch {};

    while (std::cin >> std::noskipws >> ch) {
        if (std::islower(ch))           // ①
            ch = std::toupper(ch);      // ②
        std::cout << ch;
    }
}
