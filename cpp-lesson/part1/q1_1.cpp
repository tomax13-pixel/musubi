#include <iostream>

int main() {
    int chars {0};
    int lines {0};

    for (char ch{}; std::cin >> std::noskipws >> ch; ) {
        ++chars;
        if (ch == '\n')
            ++lines;
    }

    std::cout << "chars: " << chars << "\n";
    std::cout << "lines: " << lines << "\n";
}
