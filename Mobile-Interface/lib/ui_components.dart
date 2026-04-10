import 'package:flutter/material.dart';

class Logo extends StatelessWidget {
  const Logo({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Center(
        child: Image.asset(
          "assets/images/logo.png",
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) => const Icon(Icons.broken_image, color: Colors.brown),
        ),
      ),
    );
  }
}

class AppText extends StatelessWidget {
  final String text;
  final double size;
  final double? letterSpacing;
  const AppText({
    super.key,
    required this.text,
    required this.size,
    this.letterSpacing,
  });

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(
        fontSize: size,
        letterSpacing: letterSpacing,
        color: const Color.fromARGB(255, 76, 47, 36),
      ),
    );
  }
}
