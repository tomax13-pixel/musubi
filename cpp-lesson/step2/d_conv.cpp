#include <iostream>
int main() {
    char ch {'f'};
    std::cout << "変換前: " << ch << " (" << (int)ch << ")\n";
    ch = ch - 'a' + 'A';
    std::cout << "変換後: " << ch << " (" << (int)ch << ")\n\n";

    std::cout << "a-z を全部大文字にしてみる:\n";
    for (char c {'a'}; c <= 'z'; ++c)
        std::cout << (char)(c - 'a' + 'A');
    std::cout << "\n\n";

    std::cout << "逆に A-Z を小文字にしてみる:\n";
    for (char c {'A'}; c <= 'Z'; ++c)
        std::cout << (char)(c - 'A' + 'a');
    std::cout << "\n";
}
