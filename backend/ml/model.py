from __future__ import annotations

import torch
import torch.nn as nn


class TrajectoryModel(nn.Module):
    def __init__(
        self,
        input_size: int = 2,
        hidden_size: int = 64,
        future_len: int = 12,
        num_modes: int = 3,
        num_layers: int = 1,
    ) -> None:
        super().__init__()
        self.hidden_size = hidden_size
        self.future_len = future_len
        self.num_modes = num_modes
        self.num_layers = num_layers

        self.encoder = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
        )

        self.decoder = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
        )

        self.out = nn.Linear(hidden_size, 2)

        # social pooling heads
        self.init_h = nn.Linear(hidden_size * 2, num_layers * hidden_size)
        self.init_c = nn.Linear(hidden_size * 2, num_layers * hidden_size)
        self.prob_head = nn.Linear(hidden_size * 2, num_modes)

    def forward(self, history: torch.Tensor, neighbors: torch.Tensor | None = None) -> tuple[torch.Tensor, torch.Tensor]:
        """Args:
        history: [B, 8, 2]

        Returns:
        trajectories:  [B, K, 12, 2]
        probabilities: [B, K]
        """
        if history.dim() != 3 or history.size(-1) != 2:
            raise ValueError(f"history must be [B, T, 2], got {tuple(history.shape)}")

        if neighbors is not None:
            if neighbors.dim() != 4 or neighbors.size(-1) != 2:
                raise ValueError(f"neighbors must be [B, N, T, 2], got {tuple(neighbors.shape)}")

        if self.num_modes <= 0:
            raise ValueError("num_modes must be > 0")

        # Encode ego history
        _, (h_main, _c_main) = self.encoder(history)
        h_main_last = h_main[-1]  # [B, H]

        # Encode neighbors using shared encoder, then mean pool
        if neighbors is None:
            h_neigh_pool = torch.zeros_like(h_main_last)
        else:
            b, n, t, d = neighbors.shape
            neigh_flat = neighbors.reshape(b * n, t, d)
            _, (h_neigh, _c_neigh) = self.encoder(neigh_flat)
            h_neigh_last = h_neigh[-1].reshape(b, n, self.hidden_size)  # [B, N, H]

            # mask out zero-padded neighbors
            mask = neighbors.abs().sum(dim=(2, 3)) > 0  # [B, N]
            mask_f = mask.to(dtype=h_neigh_last.dtype).unsqueeze(-1)  # [B, N, 1]
            denom = mask_f.sum(dim=1).clamp(min=1.0)
            h_neigh_pool = (h_neigh_last * mask_f).sum(dim=1) / denom  # [B, H]

            h_neigh_pool = h_neigh_pool * 2.0

        h_combined = torch.cat([h_main_last, h_neigh_pool], dim=-1)  # [B, 2H]

        # Mode probabilities from combined representation
        logits = self.prob_head(h_combined)
        probs = torch.softmax(logits, dim=-1)

        # Initialize decoder hidden/cell from combined social context
        h0 = self.init_h(h_combined).view(self.num_layers, history.size(0), self.hidden_size)
        c0 = self.init_c(h_combined).view(self.num_layers, history.size(0), self.hidden_size)

        k = self.num_modes
        if self.training:
            noise_std = 0.2
            h_noise = (
                torch.randn((h0.size(0), h0.size(1), k, h0.size(2)), device=h0.device, dtype=h0.dtype) * noise_std
            )
            c_noise = (
                torch.randn((c0.size(0), c0.size(1), k, c0.size(2)), device=c0.device, dtype=c0.dtype) * noise_std
            )
            h = (h0.unsqueeze(2) + h_noise).reshape(h0.size(0), h0.size(1) * k, h0.size(2))
            c = (c0.unsqueeze(2) + c_noise).reshape(c0.size(0), c0.size(1) * k, c0.size(2))
        else:
            h = h0.repeat_interleave(k, dim=1)
            c = c0.repeat_interleave(k, dim=1)

        # Autoregressive decode
        # Start token: last observed point
        dec_in = history[:, -1:, :].repeat_interleave(k, dim=0)  # [B*K, 1, 2]

        outputs = []
        for _ in range(self.future_len):
            dec_out, (h, c) = self.decoder(dec_in, (h, c))  # dec_out: [B, 1, H]
            step = self.out(dec_out[:, -1, :])  # [B, 2]
            outputs.append(step)
            dec_in = step.unsqueeze(1)  # feed predicted point

        traj = torch.stack(outputs, dim=1)  # [B*K, T, 2]
        b = history.size(0)
        traj = traj.view(b, k, self.future_len, 2)

        if not self.training:
            offsets = torch.tensor(
                [
                    [0.3, 0.0],
                    [-0.3, 0.2],
                    [0.0, -0.3],
                ],
                device=traj.device,
                dtype=traj.dtype,
            )

            num_modes = traj.shape[1]
            for i in range(num_modes):
                offset = offsets[i % offsets.shape[0]].view(1, 1, 2)
                traj[:, i] = traj[:, i] + offset

        return traj, probs
