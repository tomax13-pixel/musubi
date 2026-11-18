#include <iostream>
int main() {
    char ch {};
    while (std::cin >> std::noskipws >> ch)
        std::cout << ch << "-";
    std::cout << "\n";
}
