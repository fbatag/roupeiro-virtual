"""
Segmentation Service (Desativado).
O corte e segmentação de imagens foram desativados conforme solicitação do usuário.
Este módulo apenas repassa os bytes originais da imagem sem realizar recortes.
"""
import logging

logger = logging.getLogger(__name__)

def extract_clothing_piece(image_bytes: bytes, box_2d: list[int] = None) -> bytes:
    """
    Retorna os bytes originais da imagem sem realizar corte ou remoção de fundo.
    """
    return image_bytes
